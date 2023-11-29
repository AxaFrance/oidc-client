#!/bin/bash

REPO_URL="https://github.com/AxaFrance/oidc-client"
FILE="README.md"

echo "# README" > $FILE # create the readme file or overwrite if exist

tags=$(git tag) # get all tags

for tag in $tags
do
  echo "## $tag" >> $FILE # write tag as title
  commits=$(git log $tag --pretty="%h") # get the list of commits for this tag
  
  for commit in $commits
  do
     echo "- [$commit]($REPO_URL/commit/$commit)" >> $FILE # write each commit as a list item with link to the commit
  done
done
