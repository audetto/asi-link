#!/usr/bin/bash

tmp_dir=$(mktemp -d -t ci-XXXXXXXXXX)

pushd ${tmp_dir}
wget https://downloads.scratch.mit.edu/link/mac.zip
unzip mac.zip

if [ -x "$(command -v xar)" ]; then
    # in Fedora one can use
    xar -x -f scratch-*.pkg
    zcat ScratchLink.pkg/Payload | cpio -idv
elif [ -x "$(command -v 7z)" ]; then
    # in Ubuntu
    7z x scratch-*.pkg
    cpio -i -F Payload~
else
    echo xar or 7z required to unzip pkg file.
fi

popd

cp "${tmp_dir}/Scratch Link.app/Contents/Resources/scratch-device-manager.pem" .
rm -rf ${tmp_dir}

pem=scratch-device-manager.pem
openssl pkey -in ${pem} -out scratch-key.pem
openssl crl2pkcs7 -nocrl -certfile ${pem} | openssl pkcs7 -print_certs -out scratch-certs.pem
