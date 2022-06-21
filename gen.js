// gcc sample.c -g3 -fsanitize=address -fsanitize=leak -fsanitize=undefined^C
// gcc -g3 sample.c -fsanitize=address -fsanitize=leak -fsanitize=undefined
const { EventEmitter } = require("events");
const { spawn } = require("child_process");
const xlsx = require("xlsx");
const { exit } = require("shelljs");
const fs = require("fs");
const isassign = (w) => {
  let instring = false;
  for (let i = 0; i < w.length; i++) {
    if (w[i] == '"') instring = !instring;
    else if (w[i] == "=" && !instring) {
      return true;
    }
  }
  return false;
};

const remover = (w) => {
  let neww = "";
  let instring = false;
  for (let i = 0; i < w.length; i++) {
    if (w[i] == '"') {
      instring = !instring;
      neww += w[i];
    } else if (w[i] == "\r" && !instring) {
    } else {
      neww += w[i];
    }
  }
  return neww;
};
const main = async () => {
  const emitter = new EventEmitter();
  const c = spawn("gdb", ["a.out"]);
  //c.stderr.pipe(process.stdout);

  const lg = fs.createWriteStream("./log.err", { flag: "w" });
  c.stderr.pipe(lg);
  c.stdout.setMaxListeners(1000);

  const cm = () => {
    return new Promise((resolve, reject) => {
      c.stdout.on("data", (data) => {
        resolve(data);
      });
    });
  };

  const sum_cm = async () => {
    return new Promise(async (resolve, reject) => {
      let sum = "";

      while (1) {
        sum += await cm();
        emitter.emit("data");
        if (sum.indexOf("(gdb)") != -1) {
          break;
        }
      }
      resolve(sum);
    });
  };

  const cmerr = () => {
    return new Promise((resolve, reject) => {
      c.stderr.on("err", (data) => {
        resolve(data);
      });
    });
  };

  const sum_cmerr = async () => {
    return new Promise(async (resolve, reject) => {
      let sum = "";

      while (1) {
        sum += await cm();
        emitter.emit("err");
      }
      resolve(sum);
    });
  };

  let vs = new Set();
  let globals = {};
  let locals = {};
  let args = {};
  let info = {};
  let output = {};
  let error = {};
  info["func"] = [""];
  info["line"] = [0];

  let data = await sum_cm();
  console.log(data);
  c.stdin.write("set print repeats 0\n");
  data = await sum_cm();
  //console.log(data);

  // c.stdin.write("run\n");
  // data = await sum_cm();
  // console.log(data);

  c.stdin.write("b 1\n");
  data = await sum_cm();
  //console.log(data);

  c.stdin.write("run\n");
  data = await sum_cm();
  //console.log(data);
  let words;
  let cnt = 0;
  let token;
  let content;
  while (1) {
    cnt++;
    locals[cnt] = {};

    // 라인, 함수
    c.stdin.write("where\n");
    data = await sum_cm();
    //console.log(data);
    words = data.split(" ");
    if (words[2].indexOf("0") != 0) {
      info["func"].push(words[2]);
      info["line"].push(words[words.length - 2].match(/\d+/)[0]);
    } else {
      break;
    }

    //지역 변수
    c.stdin.write("info locals\n");
    data = await sum_cm();
    words = data.split("\n");
    //console.log(words);

    // 전달 인자
    // no args 처리만 나머진 local과 같음
    c.stdin.write("info args\n");
    data = await sum_cm();
    if (data.indexOf("No arguments.") != 0) {
      words = word.concat(data.split("\n"));
    } else {
      //do not anything
    }

    // 전역 변수
    // 변수리스트 받고 각각 print. newline으로 split하는 대신. 나머진 local과 같음
    c.stdin.write("info variables\n");
    data = await sum_cm();

    data = data.substring(
      data.indexOf("File " + "sample.c" + ":"),
      data.indexOf("Non-debugging symbols:")
    );
    //console.log(data);
    let tg = data.split("\n");
    let tgn = [];
    for (let i = 0; i < tg.length; i++) {
      if (tg[i].indexOf(";") != -1) {
        let tt = tg[i].split(" ");
        tgn.push(tt[tt.length - 1].substring(0, tt[tt.length - 1].length - 1));
      }
    }
    console.log({ tgn });

    for (let i = 0; i < tgn.length; i++) {
      if (tgn[i].indexOf("[") != -1) {
        tgn[i] = tgn[i].substring(0, tgn[i].indexOf("["));
      }
      c.stdin.write("print " + tgn[i] + "\n");
      data = await sum_cm();
      const ttt = data.split(" ")[0];
      data = data.replace(ttt, tgn[i]);
      //console.log(data);
      words = words.concat(data.split("\n"));
    }

    let mergedwords = [];
    //한줄로 만들고
    for (let i = 0; i < words.length - 1; i++) {
      //console.log(isassign(words[i]), words[i]);
      if (isassign(words[i])) {
        mergedwords.push(words[i]);
      } else {
        mergedwords[mergedwords.length - 1] =
          mergedwords[mergedwords.length - 1] + words[i];
      }
    }
    mergedwords = mergedwords.map((w) => remover(w));
    //console.log({ mergedwords });
    //오브젝트에 넣고
    for (let i = 0; i < mergedwords.length; i++) {
      token = mergedwords[i].split("=");
      content = mergedwords[i].substring(token[0].length + 2);
      //console.log(token);
      //console.log(content);

      if (content[0] == "{") {
        //중첩 배열을 푸는 함수 <required> + 문자열 속 구분자
        // instring이랑 " , {}등을 잘 활용해서 풀기 c#가서 스택으로 잘해보든지
        locals[cnt][token[0].replace(/\s/g, "")] = content.replace("\r", "");
        vs.add(token[0].replace(/\s/g, ""));

        let instring = false;
        let index = [];
        let start = -1;
        let max = 0;
        for (let j = 0; j < content.length; j++) {
          if (content[j] == "\\") {
            continue;
          }
          if (instring && content[j] != '"') {
            continue;
          }

          if (content[j] == "{") {
            index.push(0);
            if (max < index.length) {
              max = index.length;
            }
            if (max == index.length) {
              start = j + 1;
            }
          } else if (content[j] == "}") {
            if (max == index.length) {
              let name = token[0].replace(/\s/g, "");
              for (let k = 0; k < index.length; k++) {
                name += "[" + index[k] + "]";
              }
              let value = content.substring(start, j);
              locals[cnt][name] = value;
              vs.add(name);
            }
            index.pop();
            index[index.length - 1]++;
          } else if (content[j] == '"') {
            instring = !instring;
            if (start == -1) {
              start = j;
            }
          } else if (start == -1) {
            start = j;
          } else if (content[j] == ",") {
            if (max == index.length) {
              let name = token[0].replace(/\s/g, "");
              for (let k = 0; k < index.length; k++) {
                name += "[" + index[k] + "]";
              }
              let value = content.substring(start, j);
              locals[cnt][name] = value;
              vs.add(name);
              index[index.length - 1]++;
              start = j + 1;
            }
          }
        }
      } else {
        locals[cnt][token[0].replace(/\s/g, "")] = content.replace("\r", "");
        vs.add(token[0].replace(/\s/g, ""));
        //console.log(locals);
      }
    }

    // 출력값
    c.stdin.write("n\n");
    data = await sum_cm();
    console.log(data);
    words = data.split("\t");
    const temp = "" + (parseInt(info["line"][cnt]) + 1);
    token = words[0].replace("\t", "");
    if (token.length > temp.length) {
      const v = token.substring(0, token.length - temp.length);
      if (v.indexOf("__libc_start_call_main") != -1) {
        break;
      }
      if (v.indexOf("error") != -1) {
        error[cnt] = v;
      } else if (v) {
        output[cnt] = v;
      }
    }

    if (
      data.indexOf("exited") != -1 ||
      data.indexOf("The program is not being run.") != -1
    ) {
      break;
    }
  }
  // console.log(output);
  // console.log(info);
  // console.log(locals);
  // console.log(vs);
  // console.log(cnt);

  const aoa = [["line", "func", "output", "error"]];
  for (let item of vs) {
    aoa[0].push(item);
  }

  for (let i = 1; i <= cnt; i++) {
    const arr = [info["line"][i], info["func"][i], output[i], error[i]];
    for (let item of vs) {
      arr.push(locals[i][item]);
    }
    aoa.push(arr);
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet(aoa);
  xlsx.utils.book_append_sheet(wb, ws, "data");
  // const out = xlsx.write(wb, { bookType: "xlsx", type: "binary" });
  xlsx.writeFile(wb, "table.xlsx", { bookType: "xlsx", type: "binary" });
  console.log("end");
  exit(0);
};

main();
