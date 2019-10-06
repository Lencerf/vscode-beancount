''' load beancount file and print errors
'''
from sys import argv
from beancount import loader
from beancount.core import flags
from beancount.core.data import Transaction, Open, Close
from beancount.core.display_context import Align 
from beancount.core.realization import dump_balances, realize
from beancount.parser.printer import format_entry
import io
import json


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


entries, errors, options = loader.load_file(argv[1])
completePayeeNarration = "--payeeNarration" in argv
completeTransaction = "--transaction" in argv

error_list = [{"file": e.source['filename'], "line": e.source['lineno'], "message": e.message} for e in errors]

output = {}
accounts = {}
commodities = set()
payees = set()
narrations = set()
transactions = {}
tags = set()
links = set()
flagged_entries = []

for entry in entries:
    if hasattr(entry, 'flag') and entry.flag == "!":
        flagged_entries.append(get_flag_metadata(entry))
    if isinstance(entry, Transaction):
        if completePayeeNarration:
            payees.add(str(entry.payee))
        if not entry.narration.startswith("(Padding inserted"):
            if completePayeeNarration:
                narrations.add(str(entry.narration))
            tags.update(entry.tags)
            links.update(entry.links)
        for posting in entry.postings:
            commodities.add(posting.units.currency)
            if hasattr(posting, 'flag') and posting.flag == "!":
                flagged_entries.append(get_flag_metadata(posting))
        if completeTransaction:
            # Add transaction to dict (replace if already exists, i.e. newest transaction wins)
            if entry.payee:
                transaction_key = ' '.join([entry.flag, entry.payee, entry.narration])
            else:
                transaction_key = ' '.join([entry.flag, entry.narration])
            transaction_value = format_entry(entry)
            transaction_value = transaction_value.lstrip(entry.date.__str__()).lstrip()
            transactions[transaction_key] = transaction_value
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
output['transactions'] = transactions
output['tags'] = list(tags)
output['links'] = list(links)

print(json.dumps(error_list))
print(json.dumps(output))
print(json.dumps(flagged_entries))
