module.exports = {
  mode: 'production',
  devtool: 'source-map',
  output: {
    library: 'NetlifyClient',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          query: {
            presets: [['@babel/preset-env', { modules: 'commonjs' }]],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
}
