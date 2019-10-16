''' load beancount file and print errors
'''
from collections import defaultdict
from sys import argv, stdout, __stdout__
from beancount import loader
from beancount.core import flags
from beancount.core.data import Transaction, Open, Close
from beancount.core.display_context import Align 
from beancount.core.realization import dump_balances, realize
import io
import json
import os
import re

reverse_flag_map = {
    flag_value: flag_name[5:]
    for flag_name, flag_value
        in flags.__dict__.items()
            if flag_name.startswith('FLAG_')
}


def get_flag_metadata(thing):
    return {
        "file": thing.meta['filename'],
        "line": thing.meta['lineno'],
        "message": "{thing} has flag {flag} ({help})".format(
            thing=thing.__class__.__name__,
            flag=reverse_flag_map.get(thing.flag) or thing.flag,
            help=getattr(thing, 'narration',
                    getattr(thing, 'payee',
                        getattr(thing, 'account', r'¯\_(ツ)_/¯')))),
        "flag": thing.flag
    }


# Maximum number of transaction templates sent to the editor.
MAX_TRANSACTION_TEMPLATES = 500

# Header line of a transaction as written in the source file:
# date, flag (`txn` or a single flag character), then the rest of the line.
TRANSACTION_HEADER = re.compile(
    r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(?:txn|[*!&#?%A-Z])(?=[\s"]|$)\s*(.*)$')

source_cache = {}


def read_source_lines(filename):
    if filename not in source_cache:
        try:
            with open(filename, encoding='utf-8') as f:
                source_cache[filename] = f.read().splitlines()
        except (OSError, UnicodeDecodeError):
            source_cache[filename] = None
    return source_cache[filename]


def extract_transaction_source(lines, lineno, entry_date):
    '''Return the transaction written at 1-based line `lineno` as
    {'header': <text after the flag>, 'body': [<indented lines>]}, or None if
    the source does not look like a transaction dated `entry_date` (e.g. the
    entry was generated or modified by a plugin).'''
    if lines is None or lineno < 1 or lineno > len(lines):
        return None
    m = TRANSACTION_HEADER.match(lines[lineno - 1])
    if m is None:
        return None
    year, month, day = (int(g) for g in m.group(1, 2, 3))
    if (year, month, day) != (entry_date.year, entry_date.month, entry_date.day):
        return None
    body = []
    for line in lines[lineno:]:
        if not line.strip() or not line[0].isspace():
            break
        body.append(line.rstrip())
    return {'header': m.group(4).rstrip(), 'body': body}


stdout = open(os.devnull, 'w')
entries, errors, options = loader.load_file(argv[1])
stdout = __stdout__
completePayeeNarration = "--payeeNarration" in argv
completeTransaction = "--transaction" in argv

error_list = [{"file": e.source['filename'], "line": e.source['lineno'], "message": e.message} for e in errors]

output = {}
accounts = {}
automatics = defaultdict(dict)
commodities = set()
payees = set()
narrations = set()
transactions = {}
lastTransactionDate = None
tags = set()
links = set()
flagged_entries = []

for entry in entries:
    if hasattr(entry, 'flag') and entry.flag == "!":
        flagged_entries.append(get_flag_metadata(entry))
    if isinstance(entry, Transaction):
        if lastTransactionDate is None or entry.date > lastTransactionDate:
            lastTransactionDate = entry.date
        if completePayeeNarration:
            payees.add(f'{entry.payee}')
        if not entry.narration.startswith("(Padding inserted"):
            if completePayeeNarration:
                narrations.add(f'{entry.narration}')
            tags.update(entry.tags)
            links.update(entry.links)
        txn_commodities = set()
        for posting in entry.postings:
            txn_commodities.add(posting.units.currency)
            if hasattr(posting, 'flag') and posting.flag == "!":
                flagged_entries.append(get_flag_metadata(posting))
            if posting.meta and posting.meta.get('__automatic__', False) is True:
                # only send the posting if more than 2 legs in txn, or multiple commodities
                if len(entry.postings) > 2 or len(txn_commodities) > 1:
                    amounts = automatics[posting.meta['filename']].setdefault(posting.meta['lineno'], [])
                    amounts.append(posting.units.to_string())
        commodities.update(txn_commodities)
        if completeTransaction and entry.flag != flags.FLAG_PADDING \
                and (entry.payee or entry.narration):
            # Entries are sorted by date: re-insert so that the dict keeps the
            # most recent transaction for each (payee, narration), ordered by recency.
            transaction_key = (entry.payee or '', entry.narration or '')
            transactions.pop(transaction_key, None)
            transactions[transaction_key] = entry
    elif isinstance(entry, Open):
        accounts[entry.account] = {
            'open': entry.date.__str__(),
            'currencies': entry.currencies if entry.currencies else [],
            'close': "",
            'balance': []
        }
    elif isinstance(entry, Close):
        try:
            accounts[entry.account]['close'] = entry.date.__str__()
        except:
            continue

f = io.StringIO("")
dump_balances(realize(entries), options['dcontext'].build(alignment=Align.DOT,reserved=2), at_cost=True, fullnames=True, file=f)

for line in f.getvalue().split('\n'):
    if len(line) > 0:
        parts = [p for p in line.split(' ', 2) if len(p) > 0]
        if len(parts) > 1:
            stripped_balance = parts[1].strip()
            if len(stripped_balance) > 0:
                try:
                    accounts[parts[0]]['balance'].append(stripped_balance)
                except:
                    continue

payees.discard("")
payees.discard("None")
narrations.discard("")
narrations.discard("None")

output['accounts'] = accounts
output['commodities'] = list(commodities)
output['payees'] = list(payees)
output['narrations'] = list(narrations)
transaction_templates = []
for (payee, narration), entry in reversed(transactions.items()):
    if len(transaction_templates) >= MAX_TRANSACTION_TEMPLATES:
        break
    filename = entry.meta.get('filename', '') if entry.meta else ''
    if not filename or filename.startswith('<'):
        continue
    source = extract_transaction_source(
        read_source_lines(filename), entry.meta.get('lineno', 0), entry.date)
    if source is None:
        continue
    source.update(payee=payee, narration=narration, date=entry.date.isoformat())
    transaction_templates.append(source)

output['transactions'] = transaction_templates
output['lastTransactionDate'] = lastTransactionDate.isoformat() if lastTransactionDate else ""
output['tags'] = list(tags)
output['links'] = list(links)

print(json.dumps(error_list))
print(json.dumps(output))
print(json.dumps(flagged_entries))
print(json.dumps(automatics))
