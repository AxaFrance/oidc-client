#!/bin/bash

CHANGELOG_FILE="CHANGELOG.md"
echo "# Changelog" > $CHANGELOG_FILE
echo "" >> $CHANGELOG_FILE

REPO_URL="https://github.com/AxaFrance/oidc-client"

git log -n 100 --pretty=format:"%h%x09%an%x09%ad%x09%s%d" --date=short | while IFS= read -r line
do
read -r commit_hash commit_author commit_date commit_message remainder <<<"$line"
if [[ $remainder = *tag:* ]]; then
if [ ! -z "$tag" ]; then
echo -e "\n## $tag" >> $CHANGELOG_FILE
fi
tag=$(echo "$remainder" | grep -o "tag: [v.*[0-9]]*" | awk '{print $2}' | tr -d '(),')
echo -e "\n## $tag" >> $CHANGELOG_FILE
fi
# Generer un lien en bonne et due forme pour chaque commit
echo "- [$commit_message]($REPO_URL/commit/$commit_hash) - by $commit_author on $commit_date" >> $CHANGELOG_FILE
done
