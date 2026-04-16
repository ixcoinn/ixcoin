# Dockerfile IXCOIN Node
# Ubuntu 20.04 - OpenSSL 1.1.x (kompatibel dengan kode Bitcoin lama)
FROM ubuntu:20.04

LABEL maintainer="IXCOIN Developers"

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install semua dependensi yang dibutuhkan
RUN apt-get update && apt-get install -y \
    build-essential \
    libtool \
    autotools-dev \
    automake \
    autoconf \
    pkg-config \
    libssl-dev \
    libevent-dev \
    bsdmainutils \
    libboost-system-dev \
    libboost-filesystem-dev \
    libboost-chrono-dev \
    libboost-program-options-dev \
    libboost-test-dev \
    libboost-thread-dev \
    libdb5.3++-dev \
    libdb5.3-dev \
    libzmq3-dev \
    libgmp-dev \
    python3 \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build dengan autotools - hanya flag yang valid untuk configure.ac ini
RUN chmod +x autogen.sh && \
    ./autogen.sh && \
    ./configure \
        --prefix=/usr/local \
        --without-miniupnpc \
        --disable-man \
        --disable-zmq \
        --disable-hardening \
        --disable-reduce-exports \
    && make -j$(nproc) && \
    make install && \
    strip /usr/local/bin/ixcoind /usr/local/bin/ixcoin-cli 2>/dev/null || true

# Buat data directory
RUN mkdir -p /data/ixcoin

# Port P2P dan RPC
EXPOSE 8333 8332

ENTRYPOINT ["ixcoind"]
CMD ["-datadir=/data/ixcoin", "-printtoconsole", "-rest", "-server"]
