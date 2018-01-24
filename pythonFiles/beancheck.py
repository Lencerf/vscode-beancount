''' load beancount file and print errors
'''
from sys import argv
from beancount import loader

_, errors, _ = loader.load_file(argv[1])
for e in errors:
    print(e.source['filename'], e.source['lineno'], e.message, sep='\t\t', end='\n')
