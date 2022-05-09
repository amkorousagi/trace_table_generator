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

  let data = await sum_cm();
  //console.log(data);
  c.stdin.write("set logging on\n");
  c.stdin.write("b 1\n");
  data = await sum_cm();
  console.log(data);

  c.stdin.write("run\n");
  data = await sum_cm();
  console.log(data);
  let cnt = 0;
  while (1) {
    cnt++;

    c.stdin.write("n\n");
    data = await sum_cm();
    console.log(data);

    if (
      data.indexOf("exited") != -1 ||
      data.indexOf("The program is not being run.") != -1
    ) {
      break;
    }

    c.stdin.write("info locals\n");
    data = await sum_cm();
    console.log(data);

    c.stdin.write("info args\n");
    data = await sum_cm();
    console.log(data);

    c.stdin.write("where\n");
    data = await sum_cm();
    console.log(data);
  }

  console.log(111);
};

main();
