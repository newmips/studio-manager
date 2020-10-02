FROM node:8.11.3
MAINTAINER Newmips denis.bled@newmips.com
ADD entrypoint.sh /

# Fix for source list error when installing 8.11.3
RUN printf "deb http://archive.debian.org/debian/ jessie main\ndeb-src http://archive.debian.org/debian/ jessie main\ndeb http://security.debian.org jessie/updates main\ndeb-src http://security.debian.org jessie/updates main" > /etc/apt/sources.list

# RUN apt update && apt install unzip
RUN apt-get update && apt-get -qq -y install pdftk && apt-get -y install mysql-client && apt-get -y install nano

# Setup for ssh onto github
RUN mkdir -p /root/.ssh

ADD id_rsa /root/.ssh/id_rsa
RUN chmod 700 /root/.ssh/id_rsa

ADD id_rsa.pub /root/.ssh/id_rsa.pub
RUN chmod 700 /root/.ssh/id_rsa.pub

ADD config /root/.ssh/config

RUN chmod 777 /entrypoint.sh

VOLUME /app

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]
CMD
