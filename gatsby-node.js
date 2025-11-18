const path = require('path');
const fs = require('fs');

exports.onPreBootstrap = () => {
  const templatesDir = path.join(__dirname, 'src', 'components', 'Resume');
  const dirents = fs.readdirSync(templatesDir, { withFileTypes: true });
  const templates = dirents
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const templatesJson = JSON.stringify(templates);
  const dataDir = path.join(__dirname, 'src', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, 'templates.json'), templatesJson);
};

exports.onCreateWebpackConfig = ({ actions, loaders, stage, getConfig }) => {
  const config = getConfig();

  if (config.resolve) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
  } else {
    config.resolve = {
      alias: { '@': path.resolve(__dirname, 'src') },
    };
  }

  // This will completely replace the webpack config with the modified object.
  actions.replaceWebpackConfig(config);

  if (stage === 'build-html' || stage === 'develop-html') {
    actions.setWebpackConfig({
      module: {
        rules: [
          {
            test: /bad-module/,
            use: loaders.null(),
          },
        ],
      },
    });
  }
};
