const button1El = document.getElementById("button1");
const button2El = document.getElementById("button2");
const flagEl = document.getElementById("flag");
const lastEl = document.getElementById("last");
const rightEl = document.getElementById("right");
const wrongEl = document.getElementById("wrong");
const totalEl = document.getElementById("total");
const totalPerEl = document.getElementById("total-per");
let answer = null;
let answerCl = document.querySelector(".game__answer");
let isRight = true;

//Declare variables
let num1 = 0;
let num2 = 0;
let option1 = 0;
let option2 = 0;
let last = null;
let right = 0;
let wrong = 0;
let percRight = 0;
let total = 0;
let alternate;
let resp = [];
let response = [];

function fetchData(url) {
  axios.get(url).then((result) => {
    response = result.data;
    //console.log(response);
    renderGame();
  });
}

fetchData("https://restcountries.com/v3.1/all");
//fetchData("https://restcountries.com/v3.1/lang/por");

//Number Generation function
function getRandomInt1(max) {
  num1 = Math.floor(Math.random() * max);
  return num1;
}

function getRandomInt2(max) {
  num2 = Math.floor(Math.random() * max);
  if (num1 === num2 && num2 > 0) {
    num2 = num2 - 1;
    console.log("equal");
    return num2;
  } else if (num2 === 0) {
    num2 = num2 + 1;
    console.log("equal");
    return num2;
  } else {
    return num2;
  }
}

//Render game
function renderGame() {
  const option1 = response[getRandomInt1(250)];
  const option2 = response[getRandomInt2(250)];
  //console.log(option2);

  alternate = getRandomInt1(2);

  if (alternate == 0) {
    button1El.innerText = option1.name.common;
    button2El.innerText = option2.name.common;
    flagEl.src = option1.flags.png;
    answer = option1;
  } else {
    button1El.innerText = option1.name.common;
    button2El.innerText = option2.name.common;
    flagEl.src = option2.flags.png;
    answer = option2;
  }

  rightEl.innerText = right;
  wrongEl.innerText = wrong;
  totalEl.innerText = total;
  totalPerEl.innerHTML = percRight;

  return alternate;
}
// expected output: 0

//Button 1 click
button1El.addEventListener("click", () => {
  console.log("click");
  if (alternate === 0) {
    right++;
    total++;
    percRight = ((right / total) * 100).toFixed(1);
    //console.log(answerCl, "right");
    if (answerCl.classList == "game__answer--wrong") {
      answerCl.classList.replace("game__answer--wrong", "game__answer");
    }
  } else {
    wrong++;
    total++;
    percRight = ((right / total) * 100).toFixed(1);
    isRight = false;
    //console.log(answerCl, "wrong");
    if (answerCl.classList == "game__answer") {
      answerCl.classList.replace("game__answer", "game__answer--wrong");
    }
  }
  console.log(
    "right",
    right,
    "wrong",
    wrong,
    "total",
    total,
    "totalperc",
    percRight
  );
  lastEl.innerText = answer.name.common + " ...map link";
  answerCl.setAttribute("href", answer.maps.googleMaps);
  renderGame();
});

//Button 2 click
button2El.addEventListener("click", () => {
  console.log("click");
  if (alternate == 1) {
    right++;
    total++;
    percRight = ((right / total) * 100).toFixed(1);
    isRight = true;
    if (answerCl.classList == "game__answer--wrong") {
      answerCl.classList.replace("game__answer--wrong", "game__answer");
    }
  } else {
    wrong++;
    total++;
    percRight = ((right / total) * 100).toFixed(1);
    isRight = false;
    if (answerCl.classList == "game__answer") {
      answerCl.classList.replace("game__answer", "game__answer--wrong");
    }
  }
  console.log(
    "right",
    right,
    "wrong",
    wrong,
    "total",
    total,
    "totalperc",
    percRight
  );
  lastEl.innerText = answer.name.common + " ...map link";
  answerCl.setAttribute("href", answer.maps.googleMaps);
  renderGame();
});

function changeClass(item, class1, class2) {
  if (item.classList == class1) {
    item.classList.replace(class1, class2);
  } else {
    item.classList.replace(class2, class1);
  }
}

console.log(response);
