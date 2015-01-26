#!/bin/bash

repoUrl=$1
repoName=$(basename "$1" ".git")
repoDir="./repos/"
repoPath=$repoDir$repoName
rm -rf $repoPath
git clone $repoUrl $repoPath
./convertgit2json.sh $repoPath