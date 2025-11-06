
# syntax=docker/dockerfile:1

FROM debian:12.4-slim
RUN apt-get update && apt-get install -y unzip wget
SHELL ["/bin/bash", "--login", "-c"]
RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN . ~/.bashrc
RUN nvm install v20.10.0 > /dev/null
RUN nvm alias default v20.10.0
RUN npm install -g npm@10.4.0
WORKDIR /app
COPY src-kms src
COPY pkg-nodejs pkg-nodejs
WORKDIR /app/src

RUN npm install --loglevel=error && npm run build --loglevel=error
CMD npm run start:prod