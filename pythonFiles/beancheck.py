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


stdout = open(os.devnull, 'w')
entries, errors, options = loader.load_file(argv[1])
stdout = __stdout__
completePayeeNarration = "--payeeNarration" in argv

error_list = [{"file": e.source['filename'], "line": e.source['lineno'], "message": e.message} for e in errors]

output = {}
accounts = {}
automatics = defaultdict(dict)
commodities = set()
payees = set()
narrations = set()
tags = set()
links = set()
flagged_entries = []

for entry in entries:
    if hasattr(entry, 'flag') and entry.flag == "!":
        flagged_entries.append(get_flag_metadata(entry))
    if isinstance(entry, Transaction):
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
                    automatics[posting.meta['filename']][posting.meta['lineno']] = posting.units.to_string()
        commodities.update(txn_commodities)
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
output['tags'] = list(tags)
output['links'] = list(links)

print(json.dumps(error_list))
print(json.dumps(output))
print(json.dumps(flagged_entries))
print(json.dumps(automatics))
