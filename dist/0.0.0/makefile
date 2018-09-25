define PROJECT_HELP_MSG

Usage:
	make help
	make clean VERSION=x.x.x
	make install VERSION=x.x.x
	make clean-all

endef
export PROJECT_HELP_MSG

CURRENT_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))
PHIN_DIR:=/opt/phin
PROJECT_NAME:=node-wpa-cli
PROJECT_DIR:=/opt/phin/${PROJECT_NAME}
VERSIONS_DIR:=${PROJECT_DIR}/versions
VERSION_DIR:=${VERSIONS_DIR}/${VERSION}
DOCS_DIR:=${VERSION_DIR}/docs
SRC_TAR_NAME:=src-${VERSION}.tar

EXECUTABLES:=${VERSION_DIR}/wpa_cli.js

.PHONY: help
help:
	echo $$PROJECT_HELP_MSG


guard-VERSION:
ifndef VERSION
$(error VERSION must be passed. e.g. make [command] VERSION=x.x.x)
endif


.PHONY: clean-all
clean-all: 
	rm -r ${VERSIONS_DIR} || true


.PHONY: clean
clean: guard-VERSION
	rm -r ${VERSIONS_DIR}/${VERSION} || true


.PHONY: copy_phase
copy_phase: guard-VERSION
	mkdir -p ${VERSION_DIR}
	tar xvf ${CURRENT_DIR}/${SRC_TAR_NAME} -C ${VERSION_DIR} -m
	rm -f ${VERSIONS_DIR}/current
	ln -s -f ${VERSION_DIR} ${VERSIONS_DIR}/current
	ln -s -f ${VERSION_DIR} ${PROJECT_DIR}/current
	cp -r ${CURRENT_DIR}/docs ${DOCS_DIR}
	cp ${CURRENT_DIR}/README.md ${VERSION_DIR}


.PHONY: post_phase
post_phase: guard-VERSION
	chmod +x ${EXECUTABLES}
	cd ${VERSION_DIR} ; npm install
	true


.PHONY: install
install: guard-VERSION copy_phase post_phase
