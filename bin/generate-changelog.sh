#!/bin/bash

# Nom du fichier changelog
CHANGELOG_FILE="CHANGELOG.md"

# En-tête du changelog
echo "# Changelog" > $CHANGELOG_FILE
echo "" >> $CHANGELOG_FILE

# URL de base du repository Git
REPO_URL="https://github.com/AxaFrance/oidc-client"


# Récupérer les 100 derniers commits avec les tags et les versions au format JSON
git log -n 100 --pretty=format:'{"hash":"%h", "message":"%s", "author":"%an", "date":"%ad"}' --date=short --decorate=short --branches --tags --remotes --glob=refs/heads/* --glob=refs/tags/* --glob=refs/remotes/* --date-order --no-abbrev-commit | \
jq -s -r 'map({tag: .decoration, hash: .hash, message: .message, author: .author, date: .date}) | group_by(.tag) | .[] | .[0] | {tag: .tag, commits: .[1:]} | .tag + "\n" + (map("- [" + .message + "]('$REPO_URL'/commit/" + .hash + ") (" + .author + ", " + .date + ")") | .[])' >> $CHANGELOG_FILE