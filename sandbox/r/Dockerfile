FROM r-base:4.3.0
RUN adduser --disabled-password --gecos '' sandbox
USER sandbox
WORKDIR /sandbox
COPY runner.sh /sandbox/runner.sh
