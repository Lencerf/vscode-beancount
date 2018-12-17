''' load beancount file and print errors
'''
from sys import argv
from beancount import loader
from beancount.core import getters
from beancount.core.data import Transaction, Open, Close
from beancount.core.display_context import Align 
from beancount.core.realization import dump_balances, realize
import io
import json

entries, errors, options = loader.load_file(argv[1])

error_list = [{"file": e.source['filename'], "line": e.source['lineno'], "message": e.message} for e in errors]

output = {}
accounts = {}
commodities = set()
payees = set()
narrations = set()

for entry in entries:
    if isinstance(entry, Transaction):
        payees.add(f'"{entry.payee}"')
        if not entry.narration.startswith("(Padding inserted"):
            narrations.add(f'"{entry.narration}"')
        for posting in entry.postings:
            commodities.add(posting.units.currency)
    elif isinstance(entry, Open):
        accounts[entry.account] = {
            'open': entry.date.__str__(),
            'currencies': entry.currencies if entry.currencies else [],
            'close': "",
            'balance': "0"
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
                    accounts[parts[0]]['balance'] = stripped_balance
                except:
                    continue

payees.discard(None)
narrations.discard(None)

output['accounts'] = accounts
output['commodities'] = list(commodities)
output['payees'] = list(payees)
output['narrations'] = list(narrations)

print(json.dumps(error_list))
print(json.dumps(output))

