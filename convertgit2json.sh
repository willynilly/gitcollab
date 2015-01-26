#!/bin/bash

# https://pypi.python.org/pypi/git2json
gitDir="/.git"
repoDirPath=$1$gitDir
logSuffix="-log.json"
repoName=$(basename "$1")
dataDir="./logs/"
targetFile=$dataDir$repoName$logSuffix
git2json --git-dir $repoDirPath > $targetFile