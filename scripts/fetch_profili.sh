#!/bin/bash

set -euo pipefail

mkdir -p "tests/assets"

BASE_URL="https://www.16personalities.com/it/personalita-"

types=(INFJ INFP INTJ INTP ISFJ ISFP ISTJ ISTP ENFJ ENFP ENTJ ENTP ESFJ ESFP ESTJ ESTP)

for tipo in "${types[@]}"; do
  lowercase_tipo="${tipo,,}"
  url="${BASE_URL}${lowercase_tipo}"
  dest="tests/assets/${tipo}_16personalities.html"
  echo "Scarico $url → $dest"
  curl -s "$url" -o "$dest"
done

echo "✅ Scaricati tutti i profili MBTI da 16Personalities (HTML salvati in tests/assets)"
