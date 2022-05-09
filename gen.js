const { spawn } = require("child_process");
const main = async () => {
  const c = spawn("gdb", [".\\a.exe"]);
  //c.stdout.pipe(process.stdout);
  c.stdout.setMaxListeners(100);

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
        if (sum.indexOf("(gdb)") != -1) {
          break;
        }
      }
      resolve(sum);
    });
  };

  let globals = {};
  let locals = {};
  let args = {};
  let info = {};
  let output = {};
  info["func"] = [""];
  info["line"] = [0];

  let data = await sum_cm();

  c.stdin.write("set print repeats 0\n");
  data = await sum_cm();
  //console.log(data);

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
    console.log(words);
    for (let i = 0; i < words.length; i++) {
      if (words[i].indexOf("=") != -1) {
        token = words[i].split("=");
        content = words[i].substring(token[0].length + 2);
        console.log(token);
        console.log(content);
        if (content[0] == "{") {
          //중첩 배열을 푸는 함수 <required> + 문자열 속 구분자
          let depth = 1;
          while (depth != 0) {}
        } else {
          locals[cnt][token[0].replace(/\s/g, "")] = content.replace("\r", "");
          //console.log(locals);
        }
      }
    }

    // 전달 인자
    // no args 처리만 나머진 local과 같음
    // c.stdin.write("info args\n");
    // data = await sum_cm();
    // console.log(data);
    // console.log("\n\n\n\n\n");

    // 전역 변수
    // 변수리스트 받고 각각 print. newline으로 split하는 대신. 나머진 local과 같음
    // c.stdin.write("info variables\n");
    // data = await sum_cm();
    // console.log(data);

    // 출력값
    c.stdin.write("n\n");
    data = await sum_cm();
    words = data.split("\t");
    const temp = "" + (parseInt(info["line"][cnt]) + 1);
    token = words[0].replace("\t", "");
    if (token.length > temp.length) {
      const v = token.substring(0, token.length - temp.length);
      if (v.indexOf("tmainCRTStartup") != -1) {
        break;
      }
      if (v) {
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
  console.log(output);
  console.log(info);
  console.log(locals);
  console.log(111);
};

main();
