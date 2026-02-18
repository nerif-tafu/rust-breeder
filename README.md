# Rust Breeder

## Info

Rust Breeder is a passion project designed to help users calculate crossbreeding instructions for plants in the game [Rust](https://rust.facepunch.com/). The tool simplifies the process of optimizing plant genetics, making it easier for players to achieve their desired traits.

Available at: [rustbreeder.tafu.casa](https://rustbreeder.tafu.casa)

If you want to see it in action but don't know how to provide valid input: [click here](https://rustbreeder.tafu.casa?genes=WGXYYW,WGGXYW,WGYXGW,WYYXGW,XYYXGW,XYGXYW,YWGYGX,WGGWYX,XGYWGG,XGYWYX,WYYWGW,XYYGWX,YXGWGX,WYGXYW,WGWGYW,WYWXGG,XYGWGW,WGYWGW,XYYWYW,XYGWYX,XYGXYX,WGGXYX,XYGWYW).

## Tech Stack

- [Vue2](https://v2.vuejs.org/) + [Vuetify2](https://v2.vuetifyjs.com/) + [Typescript](https://www.typescriptlang.org/) - User Interface
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) - used for unblocking main thread and utilizing multiple CPU threads
- [Tesseract.js](https://github.com/naptha/tesseract.js) + [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API) - used for screen scanning functionality that helps avoid having to type plant genes manually

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Commands

Below is the list of commands required for development and deployment.

### Dependencies

```
npm install
```

### Compiles and Hot-Reloads for Development

```
npm run serve
```

### Compiles and Minifies for Production

```
npm run build
```

### Run Unit Tests

```
npm run test:unit
```

### Lints and Fixes Files

```
npm run lint
```

