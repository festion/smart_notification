ARG BUILD_FROM
FROM $BUILD_FROM

ENV LANG C.UTF-8

# Copy rootfs structure into the container
COPY rootfs /

# Ensure s6-overlay is PID 1
ENTRYPOINT [ "/init" ]
