FROM python:3.11-alpine
RUN adduser -D -s /bin/sh sandbox
USER sandbox
WORKDIR /sandbox
COPY runner.sh /sandbox/runner.sh
