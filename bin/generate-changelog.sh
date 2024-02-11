#!/bin/bash

num_tags=60
excluded_author="GitHub"
project_url="https://github.com/AxaFrance/oidc-client/commit"

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
    # Check the author of the commit
    author=$(git log -1 --pretty=format:"%an" $hash)

    # Exclude commits from the specified author
    if [ "$author" != "$excluded_author" ]; then
      # Get commit log in the desired format.
      # You can modify the 'format' as per your need. Please refer 'PRETTY FORMATS' section of git-log man page
      log=$(git log -1 --pretty=format:"[%h]($project_url/%H) - %s, %ad by *%an*" --date=short $hash)

      # Write formatted log to CHANGELOG.md file
      echo "- $log" >> $outfile
      echo "- $log"
    fi
done

# Space between two tags
echo "" >> $outfile
echo "" >> $outfile
done
