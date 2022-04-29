#!/bin/bash
set -eo pipefail

if [[ -z $DEBUG ]]; then
  brew install clang-format
  curl --silent --show-error --remote-name https://raw.githubusercontent.com/llvm/llvm-project/release/10.x/clang/tools/clang-format/clang-format-diff.py
fi
git diff --unified=0 --no-color @^ \
  | python clang-format-diff.py -p1 -regex '.*\.(cpp|cc|c\+\+|cxx|c|cl|h|hh|hpp|m|mm|inc)' -sort-includes \
  | npx suggestion-bot
