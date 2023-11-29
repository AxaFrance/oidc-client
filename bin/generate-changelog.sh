#!/bin/bash

num_tags=60
# Get all tag names in reverse order
tags=(`git tag -l --sort=-creatordate | head -$num_tags`)

# File to save the log
outfile=CHANGELOG.md

# Write the header
echo "# Changelog" > $outfile
echo "" >> $outfile

# Iterate over tags array
for((i=0; i<${#tags[@]}-1; i++))
do
# current tag
current=${tags[$i]}
# previous tag
previous=${tags[$i+1]}

# Write header for current tag
echo "## $current" >> $outfile
echo "## $current" 
echo "" >> $outfile

# Get commit hashes: between current and previous tag
hashes=(`git log --pretty=format:"%H" $previous..$current`)

# Output commit log for each hash
for hash in ${hashes[@]}
do
# Get commit log in desired format.
# You can modify the 'format' as per your need. Please refer 'PRETTY FORMATS' section of git-log man page
log=$(git log -1 --pretty=format:"[%h](https://github.com/AxaFrance/oidc-client/commit/%H) - %s, %ad by *%an*" --date=short $hash)

# Write formatted log to CHANGELOG.md file
echo "- $log" >> $outfile
echo "- $log"
done

# Space between two tags
echo "" >> $outfile
echo "" >> $outfile
done
