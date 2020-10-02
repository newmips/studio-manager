FROM node:8.11.3
MAINTAINER Newmips contact@newmips.com
ADD entrypoint.sh /

# Fix for source list error when installing 8.11.3
RUN printf "deb http://archive.debian.org/debian/ jessie main\ndeb-src http://archive.debian.org/debian/ jessie main\ndeb http://security.debian.org jessie/updates main\ndeb-src http://security.debian.org jessie/updates main" > /etc/apt/sources.list

# RUN apt update && apt install unzip
RUN apt-get update && apt-get -qq -y install pdftk && apt-get -y install mysql-client && apt-get -y install nano

RUN chmod 777 /entrypoint.sh

VOLUME /app

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]
CMD
