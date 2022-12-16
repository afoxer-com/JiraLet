pwd
cd web
npm run build

cd ..
set +e
rm -rf app/dist/web
set -e

mkdir -p app/dist/web
cp -rf web/dist/* app/dist/web/

cd app
npm run build

cd ..
pwd
npm start