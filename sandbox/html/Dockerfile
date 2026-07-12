FROM node:20-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN adduser -D -s /bin/sh sandbox
USER sandbox
WORKDIR /sandbox
COPY runner.sh /sandbox/runner.sh
