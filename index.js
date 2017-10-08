const path = require('path');
const { Doclet } = require('jsdoc/doclet');

const Transforms = {
  lowerCase: (s) => s.toLowerCase(),
  upperCase: (s) => s.toUpperCase(),
  key: ([key]) => key,
  value: ([, value]) => value,
};

const ThisRe = new RegExp(`\\(\\(THIS\\)(${Object.keys(Transforms).join('|')})?\\)`, 'g');
const DynamicRe = /@dynamic [^\n]+/g;

const addons = [];

exports.defineTags = (dictionary) => {
  dictionary.defineTag('dynamic', {
    onTagged(doclet, tag) {
      doclet.comment = doclet.comment.replace(DynamicRe, '');
      const ex = require(path.join(doclet.meta.path, doclet.meta.filename));
      tag.value = tag.value.split('\n')[0];
      const target = ex[tag.value.replace('this.', '')];
      const iterator = Array.isArray(target) ? target : Object.entries(target);
      for (const item of iterator) {
        let match;
        let comment = String(doclet.comment);
        while ((match = ThisRe.exec(comment)) !== null) {
          const modifier = match[1];
          const t = modifier ? Transforms[modifier](item) : item;
          comment = comment.replace(match[0], t);
        }
        addons.push(new Doclet(comment, doclet.meta));
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
      if (d.undocumented || !d.name) continue;
      if (ThisRe.test(d.name)) doclets.splice(i, 1);
    }
    for (const item of addons) {
      if (doclets.find((d) => d.longname === item.longname)) return;
      doclets.push(item);
    }
  },
};
