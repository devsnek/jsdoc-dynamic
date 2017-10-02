const path = require('path');
const jsdoc = require('jsdoc-api');
const logger = require('jsdoc/util/logger');

const Transforms = {
  lowerCase: (s) => s.toLowerCase(),
  upperCase: (s) => s.toUpperCase(),
};

const ThisRe = new RegExp(`\\(\\(THIS\\)(${Object.keys(Transforms).join('|')})?\\)`, 'g');

const addons = [];

exports.defineTags = (dictionary) => {
  dictionary.defineTag('dynamic', {
    onTagged(doclet, tag) {
      const ex = require(path.join(doclet.meta.path, doclet.meta.filename));
      const iterator = ex[tag.value.replace('this.', '')];
      for (const item of iterator) {
        let match;
        let comment = String(doclet.comment);
        while ((match = ThisRe.exec(comment)) !== null) {
          const modifier = match[1];
          const t = modifier ? Transforms[modifier](item) : item;
          comment = comment.replace(ThisRe, t);
        }
        const [parsed] = jsdoc.explainSync({ source: comment });
        parsed.meta.path = doclet.meta.path;
        parsed.meta.filename = doclet.meta.filename;
        parsed.meta.lineno = doclet.meta.lineno;
        parsed.meta.columnno = doclet.meta.columno;
        // logger.warn(`jsdoc-api slowness update: ${item} handled`);
        addons.push(parsed);
      }
    },
    mustHaveValue: true,
    canHaveType: false,
  });
};

exports.handlers = {
  parseComplete({ doclets }) {
    for (let i in doclets) {
      const d = doclets[i];
      if (d.undocumented || !d.comment) continue;
      if (d.comment.includes('@dynamic')) doclets.splice(i, 1);
    }
    doclets.push(...addons);
  },
};
