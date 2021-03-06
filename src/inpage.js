import Vue from 'vue'
import store from './store';
import { NETWORKS } from './constants.json';
import PostScore from './components/PostScore';
import CommentScore from './components/CommentScore';
import Popup from './components/Popup';
import bases from 'bases';
import * as unique from 'array-unique';
import * as Promise from 'bluebird';
let started = false;

const start = async () => {
  started = true;
  let hasWeb3 = await store.dispatch("setWeb3");
  if(!hasWeb3) return;
  let network = await store.dispatch("setNetwork");
  if(![NETWORKS.RINKEBY, NETWORKS.OTHER].includes(network)) return;
  store.dispatch("setContracts");
  await store.dispatch("setDecimals");
  let defaultAccount = await getDefaultAccount();
  if(defaultAccount){
    await store.dispatch("setAccount", defaultAccount)
  }
  styleOverrides();
  mountTipper();
  preparePostScores();
  prepareCommentScores();
  await prepareUsers();
  poll();
  setInterval(poll, 2000);
}

window.vuexStore = store;

if (document.visibilityState == "visible") {
  start();
} else {
  document.addEventListener('visibilitychange', handleVisibilityChange, false);
}

function handleVisibilityChange() {
  if (!started && document.visibilityState == "visible") {
    start();
  }
}

function styleOverrides(){
  let styles = document.createElement('style');
  styles.innerText = `
.midcol {
  overflow: visible;
}`;
  document.body.appendChild(styles);
}

function mountTipper(){
  let div = document.createElement('div');
  document.body.appendChild(div);
  const tipper = new Vue({
    ...Popup,
    store,
    propsData: {}
  })
  tipper.$mount(div);
}

window.bases = bases;

function preparePostScores(){
  let idPrefix = "thing_t3_";
  let $posts = document.querySelectorAll(`[id^='${idPrefix}']`);
  $posts.forEach(($post, idx) => {
    let id = $post.id.replace(idPrefix, "");
    // let idB36 = $post.id.replace(idPrefix, "");
    // let id = bases.fromBase36(idB36);
    // console.log(id)
    let author = $post.getAttribute("data-author");
    let url = $post.getAttribute("data-permalink");
    let span = document.createElement('span');
    let $redditScore = $post.getElementsByClassName('midcol')[0];
    $redditScore.insertBefore(span, $redditScore.getElementsByClassName('arrow down')[0]);
    const score = new Vue({
      ...PostScore,
      store,
      propsData: {id, author, url}
    })
    score.$mount(span);
  });
}

function prepareCommentScores(){
  let idPrefix = "thing_t1_";
  let $comments = document.querySelectorAll(`[id^='${idPrefix}']`);
  $comments.forEach(($comment, idx) => {
    let id = $comment.id.replace(idPrefix, "");
    // let idB36 = $comment.id.replace(idPrefix, "");
    // let id = bases.fromBase36(idB36);
    let author = $comment.getAttribute("data-author");
    let url = $comment.getAttribute("data-permalink");
    let span = document.createElement('span');
    let $tagline = $comment.getElementsByClassName('tagline')[0];
    $tagline.appendChild(span);
    // $tagline.insertBefore(span, $tagline.getElementsByTagName('time')[0]);
    const score = new Vue({
      ...CommentScore,
      store,
      propsData: {id, author, url}
    })
    score.$mount(span);
  });
}

async function prepareUsers(){
  let $authors = document.querySelectorAll('.thing a[href*="reddit.com/user/"]');
  // const usernames = noDupe([...$authors].map(a=>a.innerText));
  let usernames = unique([...$authors].map(a=>a.innerText));
  // console.log(usernames);
  let Registry = store.state.contracts.Registry;
  return Promise.map(usernames, username=>{
    return Registry.methods.getOwner(web3.utils.asciiToHex(username)).call().then(address=>{
      if (address !== "0x0000000000000000000000000000000000000000") {
        let tags = document.querySelectorAll(`a[href$="reddit.com/user/${username}"]`);
        tags.forEach(t=>t.classList.add("is-reg"));
      }
    })
  });
}

async function getDefaultAccount(){
  return web3.eth.getAccounts()
    .then(accounts=>accounts[0]);
}

function poll(){
  web3.eth.getBlockNumber()
    .then(num=>store.commit("SET_BLOCK_NUM", num));
}
