pwd

 set +e
 rm -rf app/webdist
 set -e
 mkdir -p app/webdist

cd web
yarn install
yarn build

cd ..

cd app
yarn install
yarn build

cd ..
pwd