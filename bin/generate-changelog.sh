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
jq -r 'select(.tag != null) | .tag |= sub("tag: "; "") | .tag + "," + .hash + "," + .message + "," + .author + "," + .date' | \
while IFS=',' read -r tag commit_hash commit_message commit_author commit_date; do
    if [ ! -z "$tag" ]; then
        echo -e "\n## $tag" >> $CHANGELOG_FILE
    fi
    echo "- [$commit_message]('$REPO_URL'/commit/$commit_hash) ($commit_author, $commit_date)" >> $CHANGELOG_FILE
done