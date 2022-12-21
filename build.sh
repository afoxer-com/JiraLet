set +e
rm -rf app/webdist
set -e
mkdir -p app/webdist

yarn --cwd ./web install
yarn --cwd ./web build
yarn --cwd ./app install
yarn --cwd ./app build
