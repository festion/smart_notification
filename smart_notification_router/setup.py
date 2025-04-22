from setuptools import setup, find_packages

setup(
    name="smart_notification_router",
    version="2.0.0-alpha.4",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'paho-mqtt',
        'pyyaml',
        'flask',
        'requests',
        'jinja2',
    ],
)