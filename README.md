# HMDA Rule Engine

## This project is a work in progress
Nothing presented in the issues or in this repo is a final product unless it is marked as such.

**Description**:  The HMDA Rule Engine processes the [HMDA Edits](http://www.ffiec.gov/hmda/edits.htm) as defined by the FFIEC. It requires as input a valid [HMDA data file](http://www.ffiec.gov/hmda/fileformats.htm). The engine understands edit rules written in the [brij-spec](http://github.com/linuxbozo/brij-spec) standard.

## Requirements

The project requires [NodeJS](http://nodejs.org) (npm) to build and manage dependencies.

## How to get this running or how to use it

Make sure you have [NodeJS](https://nodejs.org) installed (version 0.10.33), and you can use the `npm` command:

```shell
npm version
```

Install [Grunt](http://gruntjs.com) globally:

```shell
npm install -g grunt-cli
```

Then install dependencies from the project root directory:

```shell
npm install
```

Running the tests:
```shell
grunt test
```

## Getting involved

For details on how to get involved, please first read our [CONTRIBUTING](CONTRIBUTING.md) guidelines.
This project follows an adapted pull request [workflow](https://github.com/cfpb/hmda-pilot/wiki/GitHub-workflow) on top of GitHub, please consult the details before adding features to the project.


----

## Open source licensing info
1. [TERMS](TERMS.md)
2. [LICENSE](LICENSE)
3. [CFPB Source Code Policy](https://github.com/cfpb/source-code-policy/)


----

## Credits and references

1. Projects that inspired you
2. Related projects
3. Books, papers, talks, or other sources that have meaniginful impact or influence on this project
