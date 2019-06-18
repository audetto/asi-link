#!/usr/bin/bash

tmp_dir=$(mktemp -d -t ci-XXXXXXXXXX)

pushd ${tmp_dir}
wget https://downloads.scratch.mit.edu/link/mac.zip
unzip mac.zip
xar -x -f mac-*.pkg
zcat ScratchLink.pkg/Payload | cpio -idv
popd

cp "${tmp_dir}/Scratch Link.app/Contents/Resources/scratch-device-manager.pem" .
rm -rf ${tmp_dir}

pem=scratch-device-manager.pem
openssl pkey -in ${pem} -out scratch-key.pem
openssl crl2pkcs7 -nocrl -certfile ${pem} | openssl pkcs7 -print_certs -out scratch-certs.pem
