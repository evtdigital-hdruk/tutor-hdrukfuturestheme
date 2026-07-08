#!/usr/bin/env sh
# Lint this theme's JavaScript as ES5.
#
# Why: Open edX's `collectstatic` compresses Django-Pipeline JS packages with
# the classic, ES5-only `uglify-js`. plugin.py concatenates this theme's JS
# (theme-core.js, dark-theme.js) into the base_application / application /
# certificates_wv packages, so ANY ES6+ syntax (const/let, arrow functions,
# template literals, for-of, classes, ...spread) makes the slow Open edX Docker
# image build fail late with:
#
#   pipeline.exceptions.CompressorError: SyntaxError: Unexpected token ...
#
# This catches it in seconds, before the image build.
#
# Zero committed deps: parses with `npx acorn` (Node ships on CI runners).
# The files are Jinja-templated, so {% ... %} / {{ ... }} tags are stripped
# before parsing (a heuristic that holds because our Jinja only wraps whole
# statements or sits inside string literals).
set -eu

ACORN_VERSION=8
JS_ROOT="tutorhdrukfuturestheme/templates"
status=0
checked=0

files=$(find "$JS_ROOT" -path '*/static/js/*.js' | sort)
if [ -z "$files" ]; then
  echo "lint-es5: no theme JS found under $JS_ROOT" >&2
  exit 1
fi

for f in $files; do
  checked=$((checked + 1))
  if sed -E 's/\{%[^%]*%\}//g; s/\{\{[^}]*\}\}//g' "$f" \
       | npx --yes "acorn@${ACORN_VERSION}" --ecma5 --silent; then
    echo "ok   (es5) $f"
  else
    echo "FAIL (es6) $f -- Open edX pipeline uglify-js is ES5-only; use var, no arrow fns / template literals / for-of" >&2
    status=1
  fi
done

echo "lint-es5: checked $checked file(s)"
exit $status
