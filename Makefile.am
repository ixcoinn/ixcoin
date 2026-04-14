# Copyright (c) 2013-2020 The Bitcoin Core developers
# Copyright (c) 2021-2023 IXC Developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

ACLOCAL_AMFLAGS = -I build-aux/m4
SUBDIRS = src
if ENABLE_MAN
SUBDIRS += doc/man
endif

export PYTHONPATH

.PHONY: deploy FORCE

if BUILD_IXC_LIBS
pkgconfigdir = $(libdir)/pkgconfig
pkgconfig_DATA = libixcoinconsensus.pc
endif

IXCOIND_BIN=$(top_builddir)/src/$(IXC_DAEMON_NAME)$(EXEEXT)
IXCOIND_QT_BIN=
IXCOIND_TEST_BIN=
IXC_CLI_BIN=$(top_builddir)/src/$(IXC_CLI_NAME)$(EXEEXT)
IXC_TX_BIN=
IXC_UTIL_BIN=
IXC_WALLET_BIN=
IXC_NODE_BIN=
IXC_GUI_BIN=
IXC_WIN_INSTALLER=$(PACKAGE)-$(PACKAGE_VERSION)-win$(WINDOWS_BITS)-setup$(EXEEXT)

empty :=
space := $(empty) $(empty)

DIST_DOCS = $(wildcard doc/*.md) $(wildcard doc/release-notes/*.md)
DIST_CONTRIB = \
		   $(top_srcdir)/contrib/ixcoin-cli.bash-completion \
	       $(top_srcdir)/contrib/ixcoin-tx.bash-completion \
	       $(top_srcdir)/contrib/ixcoind.bash-completion \
	       $(top_srcdir)/contrib/init \
	       $(top_srcdir)/contrib/rpm

BIN_CHECKS=$(top_srcdir)/contrib/devtools/symbol-check.py \
           $(top_srcdir)/contrib/devtools/security-check.py

BUILD_FILES=$(top_srcdir)/share/genbuild.sh \
            $(top_srcdir)/share/on_prod_tag.sh

WINDOWS_PACKAGING = 
COVERAGE_INFO = baseline_filtered_combined.info baseline.info \
  leveldb_baseline.info test_ixc_filtered.info total_coverage.info \
  baseline_filtered.info functional_test.info functional_test_filtered.info \
  leveldb_baseline_filtered.info test_ixc_coverage.info test_ixc.info

dist-hook:
	-$(GIT) archive --format=tar HEAD -- src/clientversion.cpp | $(AMTAR) -C $(top_distdir) -xf -

$(IXC_WIN_INSTALLER): all-recursive
	$(MKDIR_P) $(top_builddir)/release
	STRIPPROG="$(STRIP)" $(INSTALL_STRIP_PROGRAM) $(IXCOIND_BIN) $(top_builddir)/release
	STRIPPROG="$(STRIP)" $(INSTALL_STRIP_PROGRAM) $(IXC_CLI_BIN) $(top_builddir)/release
	@test -f $(MAKENSIS) && $(MAKENSIS) -V2 $(top_builddir)/share/setup.nsi || \
	  echo error: could not build $@
	@echo built $@

$(if $(findstring src/,$(MAKECMDGOALS)),$(MAKECMDGOALS), none): FORCE
	$(MAKE) -C src $(patsubst src/%,%,$@)

if TARGET_WINDOWS
deploy: $(IXC_WIN_INSTALLER)
endif

$(IXCOIND_BIN): FORCE
	$(MAKE) -C src $(@F)

$(IXC_CLI_BIN): FORCE
	$(MAKE) -C src $(@F)

if USE_LCOV

LCOV_FILTER_PATTERN = \
	-p "/usr/local/" \
	-p "/usr/include/" \
	-p "/usr/lib/" \
	-p "/usr/lib64/" \
	-p "src/leveldb/" \
	-p "src/crc32c/" \
	-p "src/crypto/ctaes" \
	-p "src/minisketch" \
	-p "src/secp256k1" \
	-p "depends"


baseline.info:
	$(MAKE) -C src/
	$(LCOV) -c -i -d $(abs_builddir)/src -o $@

baseline_filtered.info: baseline.info
	$(LCOV) -r $< "/usr/include/*" -o $@

leveldb_baseline.info: baseline_filtered.info
	$(LCOV) -c -i -d $(abs_builddir)/src/leveldb -b $(abs_builddir)/src/leveldb -o $@

leveldb_baseline_filtered.info: leveldb_baseline.info
	$(LCOV) -r $< "/usr/include/*" -o $@

baseline_filtered_combined.info: leveldb_baseline_filtered.info baseline_filtered.info
	$(LCOV) -a leveldb_baseline_filtered.info -a baseline_filtered.info -o $@

total_coverage.info: baseline_filtered_combined.info 
	$(LCOV) -a baseline_filtered.info -a leveldb_baseline_filtered.info -o $@ | $(GREP) "\%" | $(AWK) '{ print substr($$3,2,50) "/" $$5 }' > coverage_percent.txt

total.coverage/.dirstamp: total_coverage.info
	$(GENHTML) -s $< -o $(@D)
	@touch $@

cov: total.coverage/.dirstamp

endif

dist_noinst_SCRIPTS = autogen.sh

EXTRA_DIST = $(BUILD_FILES) $(DIST_CONTRIB) $(DIST_DOCS) $(WINDOWS_PACKAGING) $(WINDOWS_PACKAGING) $(BIN_CHECKS)
CLEANFILES = $(IXC_WIN_INSTALLER)

.INTERMEDIATE: $(COVERAGE_INFO)

DISTCHECK_CONFIGURE_FLAGS = --enable-man

doc/doxygen/.stamp: doc/Doxyfile FORCE
	$(MKDIR_P) $(@D)
	$(DOXYGEN) $^
	$(AM_V_at) touch $@

if HAVE_DOXYGEN
docs: doc/doxygen/.stamp
else
docs:
	@echo "error: doxygen not found"
endif

clean-local: 
	rm -rf cache/
	rm -rf total.coverage/
	rm -rf coverage_percent.txt

