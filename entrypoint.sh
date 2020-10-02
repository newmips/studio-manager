#!/bin/bash

echo $GITURL
echo $APPNAME

eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

cd /app/$APPNAME
echo $(pwd)

if [ $(pwd) = "/app" ]; then
  git clone $GITURL
  cd /app/$APPNAME
  npm install
  npm install -g promise
  npm start
else

  current_version=`cat deploy.txt`
  echo $current_version
  git fetch
  git checkout FETCH_HEAD -- deploy.txt
  
  new_version=`cat deploy.txt`
  echo $new_version
  
  if [ "$current_version" == "$new_version" ]; then
	  npm start
  else
	  git pull
	  cp models/toSyncProd.lock.json models/toSync.json
	  npm install
	  npm start
  fi
fi
