#!/bin/bash

# Nom du fichier changelog
CHANGELOG_FILE="CHANGELOG.md"

# En-tête du changelog
echo "# Changelog" > $CHANGELOG_FILE
echo "" >> $CHANGELOG_FILE

# URL de base du repository Git
REPO_URL="https://github.com/AxaFrance/oidc-client"


# Récupérer les 100 derniers commits avec les tags et les versions
git log -n 100 --pretty=format:"%d %s [%h] (%an, %ad)" --date=short | \
while IFS= read -r line; do
    if [[ $line == *tag:* ]]; then
        if [ ! -z "$tag" ]; then
            echo -e "\n## $tag"
        fi
        tag=$(echo "$line" | awk '{print $2}' | tr -d '(),')
    else
        commit_hash=$(echo "$line" | awk '{print $3}')
        commit_message=$(echo "$line" | awk '{$1=$2=$3=""; print $0}')
        echo "- [$commit_message]($REPO_URL/commit/$commit_hash)"
    fi
done >> $CHANGELOG_FILE

# Ajouter le dernier tag s'il existe
if [ ! -z "$tag" ]; then
    echo -e "\n## $tag" >> $CHANGELOG_FILE
fi