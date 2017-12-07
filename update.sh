#!/bin/bash
TAG=$(date +%s)
URI=gcr.io/tweetspy/tweetspy-watcher
docker build -t $URI:$TAG .
gcloud docker -- push $URI:$TAG
kubectl set image deployment tweetspy-watcher tweetspy-watcher=$URI:$TAG
kubectl rollout status deployment tweetspy-watcher
