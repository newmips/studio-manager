#!/bin/bash

echo $APPNAME

cd /app/$APPNAME
echo $(pwd)

if [ $(pwd) = "/app" ]; then
  cd /app/$APPNAME
  npm install
  npm start
fi
