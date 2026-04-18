IXC
=====================

Setup
---------------------
IXC is an implementation of a node for the IXC network and is one of the pieces of software that provide 
the backbone of the network. It downloads and stores the entire history of IXC transactions (which is currently 
several GBs); depending on the speed of your computer and network connection, the synchronization process can take 
anywhere from a few hours to a day or more.

Running
---------------------
IXC is only supported on the Linux and docker platforms at this time.

To run IXC on Linux:

* ensure that your system meets the minimum recommended
* unpack the files into a directory
* run `bin/ixcoind`
 
### Need Help?

* Log an issue on [GitHub] (https://github.com/ixc-labs/ixcoin/issues)

Building
---------------------
The following are developer notes on how to build ixc. They are not complete guides, but include notes on the 
necessary libraries, compile flags, etc.

- [Unix Build Notes](build-unix.md)

Development
---------------------
The IXC repo's [root README](/README.md) contains relevant information on the development process and automated 
testing.

- [Developer Notes](developer-notes.md)
- [Release Notes](release-notes.md)
- [Unauthenticated REST Interface](REST-interface.md)
- [Shared Libraries](shared-libraries.md)
- [BIPS](bips.md)

### Miscellaneous
- [Assets Attribution](assets-attribution.md)
- [Files](files.md)
- [Fuzz-testing](fuzzing.md)
- [Reduce Traffic](reduce-traffic.md)
- [Init Scripts (systemd/upstart/openrc)](init.md)
- [ZMQ](zmq.md)

License
---------------------
This product includes software developed by the OpenSSL 
Project for use in the [OpenSSL Toolkit](https://www.openssl.org/), cryptographic software written by Eric Young 
([eay@cryptsoft.com](mailto:eay@cryptsoft.com)), and UPnP software written by Thomas Bernard.
