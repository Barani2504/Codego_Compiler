#!/bin/bash
LANGUAGE=$1
CODE_FILE=$2
INPUT_FILE=${3:-/dev/null}
TIMEOUT=5

case $LANGUAGE in
  python)
    timeout $TIMEOUT python3 "$CODE_FILE" < "$INPUT_FILE"
    ;;
  javascript)
    timeout $TIMEOUT node "$CODE_FILE" < "$INPUT_FILE"
    ;;
  java)
    javac -d /tmp "$CODE_FILE" 2>&1 || exit 1
    CLASS=$(basename "$CODE_FILE" .java)
    timeout $TIMEOUT java -cp /tmp "$CLASS" < "$INPUT_FILE"
    ;;
  cpp)
    g++ -O2 -o /tmp/sol "$CODE_FILE" 2>&1 || exit 1
    timeout $TIMEOUT /tmp/sol < "$INPUT_FILE"
    ;;
  c)
    gcc -O2 -o /tmp/sol "$CODE_FILE" 2>&1 || exit 1
    timeout $TIMEOUT /tmp/sol < "$INPUT_FILE"
    ;;
  r)
    timeout $TIMEOUT Rscript "$CODE_FILE" < "$INPUT_FILE"
    ;;
  html|css)
    # HTML/CSS graded structurally by AI — just echo the code
    cat "$CODE_FILE"
    exit 0
    ;;
  *)
    echo "Unsupported language: $LANGUAGE"
    exit 1
    ;;
esac
exit $?
