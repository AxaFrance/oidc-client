#!/bin/bash

# Nom du fichier changelog
CHANGELOG_FILE="CHANGELOG.md"

# En-tête du changelog
echo "# Changelog" > $CHANGELOG_FILE
echo "" >> $CHANGELOG_FILE

# URL de base du repository Git
REPO_URL="https://github.com/AxaFrance/oidc-client"

# Récupérer les 100 derniers commits avec les tags et les versions au format JSON
git log -n 100 --pretty=format:'{"tag":"%d", "hash":"%h", "message":"%s", "author":"%an", "date":"%ad"}' --date=short --decorate=short --branches --tags --remotes --glob=refs/heads/* --glob=refs/tags/* --glob=refs/remotes/* --date-order --no-abbrev-commit | \
jq -r 'select(.tag != null) | .tag |= sub("tag: "; "") | {tag: .tag, commits: [.hash, .message, .author, .date]}' | \
awk '/tag:/ {if (tag) {print "\n## " tag} tag = $2; next} {commit_hash=$1; commit_message=$2; commit_author=$3; commit_date=$4; print "- [" commit_message "]('"$REPO_URL"/commit/" commit_hash "') (" commit_author ", " commit_date ")"} END {if (tag) {print "\n## " tag}}' >> $CHANGELOG_FILE