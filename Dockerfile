FROM node:8.17
MAINTAINER Newmips contact@newmips.com
ADD entrypoint.sh /

# RUN apt update && apt install unzip
RUN apt-get update && apt-get -y install mysql-client && apt-get -y install nano

RUN chmod 777 /entrypoint.sh

VOLUME /app

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]
CMD
