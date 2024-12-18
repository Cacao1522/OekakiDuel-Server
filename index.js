const crypto = require('crypto');
const express = require('express');
const { createServer } = require('http');
const { send } = require('process');
const WebSocket = require('ws');
const app = express();
const port = 3000;
let serialNumber = 0;//通し番号
const server = createServer(app);
const wss = new WebSocket.Server({ server });
const flag = 1; //0:画像未送信、1:画像送信済み
const roundnum = 20;      // 現在ラウンド数 わかりやすいように20になっていますが本当は0
const turnManege = 0;   // 1ターンのどこに該当するかを保持する
/*
0:ターン開始処理

↓プレイやーごとに行うので2回
1:カード選択処理 
2:カード選択処理　

3:バトル前特殊効果
4:バトル前特殊効果
5:バトル処理　早いほう
6:バトル処理　遅いほう
7:バトル後特殊効果1
8:バトル後特殊効果2
9:ターン終了処理 +特殊効果がある場合は清算

*/
//あとでインスタンス化
class Player {
  constructor(id,ip,hp) {
    this.ip = ip;
    this.id = id;
    hp = 200;//とりあえず50
  }
}

Players = Array.from({ length: 2 }, () => Array(2));//プレイヤーのインスタンス初期値
Players[0][0] = new Player(0, 1, 200); //プレイヤー１のインスタンス初期値
Players[0][1] = new Player(1, 1, 200); //プレイヤー１のインスタンス初期値
class Card{
  constructor(id,player,def,atk,spd,effID){
    this.player = player;//どっちのプレイヤーのカードか このパラメータ使わないかも　cards配列で管理するから
    this.id = id;//カード番号
    this.def = def;//防御力
    this.atk = atk;//攻撃力
    this.spd = spd;//速さ
    this.eff = effID;//効果
  }
  effectActive(){
    //効果の発動
    switch(this.effID){
      case 10:
        //効果10
         //確実に先制攻撃
        if(turnManege === 3|| turnManege === 4){
          selectedCard[this.player + 1 % 2][0].spd = 0;//相手の速さを0にする
        }
        break;
      case 11:
        //効果11
        //相手の攻撃無効化
        if(turnManege === 3|| turnManege === 4){
          selectedCard[this.player + 1 % 2][0].atk = 0;
        }
        break;
      case 12:
        //効果12
        //ターン終了時に自分の体力全回復
        if(turnManege === 7 || turnManege === 8){
          Players[this.player][0].hp = 200;
        }
        break;
      case 13:
        if(turnManege === 7 || turnManege === 8){
          Players[this.player][0].hp = 200;
        }
        break;
      case 14:
        //効果14
        //相手の防御力が自分の防御力の3倍以上とかのときに相手の体力を残り5くらいまで減らす
        if(turnManege === 7 || turnManege === 8){
          if(selectedCard[this.player + 1 % 2][0].def >= this.def * 3){
            Players[this.player + 1 % 2][0].hp = 5;
          }
        }
        break;
      case 15:
        //効果15
         //相手の素早さを下げる
        if(turnManege === 3|| turnManege === 4){
          selectedCard[this.player + 1 % 2][0].spd = -20;
        }
        break;
      case 16:
        //効果16
        //両者の攻撃無効化
        if(turnManege === 3|| turnManege === 4){
          selectedCard[this.player][0].atk = 0;
          selectedCard[this.player + 1 % 2][0].atk = 0;
        }
        break;
    }
  }
}

const cards  = Array.from({ length: 2 }, () => Array(5));//こっちの方がかんりしやすい
const selectedCard = Array.from({ length: 2 }, () => Array(1));


let nextplayerID = 0;//最初にアクセスしたプレイヤーのID
wss.on('connection', function(ws) {//クライアントが接続してきたときの処理
  console.log("client joined.");
  const PlayerID = nextplayerID
  nextplayerID++;    //次にアクセスするプレイヤーのID
  const responsetest = new ArrayBuffer(1);
  const view = new DataView(responsetest);
  view.setUint8(0, PlayerID);//クライアントにプレイヤーIDを送信
  ws.send(responsetest);

  ws.on('message', function(data) {//クライアントからメッセージを受信したときの処理
    if(flag == 0){//画像の送受信用 マッチング処理もあった...
      //画像の受信
      //画像の受信が完了したらflag = 1にする
    }else{//以下に
      //テスト用
      const useData = BinaryTranslation(data);
      for(let i = 0; i < useData.length; i++){
        console.log("バイナリデータ",useData[i]);
      }

      //通信種別による関数の呼び出し
      switch(useData[0]){//種別に応じて関数を呼び出す
        case 30://ラウンドが始まったことをクライアントに送信
          serialNumber++;
          turnManege = 1;
          roundnum++; //クライアントが２回アクセスするから要検証
          send_data = [30, turnManege, roundnum];
          sendBinaryData(ws, send_data);
          break;
        case 32:
          serialNumber++;
          send_data = [32,serialNumber, SelectCard.player, SelectCard.player,SelectCard.eff,hpnum]
          break;
        case 33:
          serialNumber++;
          break;  
        case 36://選択カードの受信と選択カードの開示
          let selectedCard = CardSelect(useData);//選ばれたカードの取得
          let pid = useData[2];//プレイヤーID 0 or 1
          let send_data = [31, serialNumber, pid, selectedCard.id];//データの送信
          turnManege++;//ターンのどこなのかを管理

          sendBinaryData(ws,send_data);
          if(turnManege === 2){
            EffBeforeBattle(pid);
          }
          break;
<<<<<<< HEAD
      //   }else{
      //     serialNumber++;
      //     cid = 0;
      //         cards[pid][cid] = new Card(cards[2],cards[3],cards[4],cards[5],cards[6],cards[7]); //ATK,DEF,SPD,EFF,カード番,プレイヤー番号
      //         cards.push(cards[pid][cid]);
      //     cid++;
      //     console.log(cid);
      //   if(cid == 10){
      //     flag == 2;
      //     console.log("flagが2になったよ");
      //   }  
      // }
=======
>>>>>>> dev_ima
      }
    }
    console.log("現在のターン数",roundnum);
    //カード情報の保存
    if (typeof(data) === "string") {
      console.log("Error: バイナリーではないデータが送信されました");
    } else {
      BinaryTranslation(data);
    }
    
    
    //バトル前に発動する効果
    function UniqueEffectBefore(){
    //特殊効果発動順序
     if(SelectCard.spd > SelectCard.spd){
      SelectCard.eff.effectActive();
      SelectCard.eff.effectActive();  
     }
     else{
      SelectCard.eff.effectActive();
      SelectCard.eff.effectActive();  
     }
    }
      function  BattleFlow(){
      //カードの速さを比較
      if(SelectCard.spd > SelectCard.spd){
        //先にプレイヤー１が攻撃
        BattleCalc(SelectCard.player, SelectCard.atk, SelectCard.def, Player2.hp); 
        //後からプレイヤー２が攻撃
        BattleCalc(SelectCard.player, SelectCard.atk, SelectCard.def, Player1.hp);
      } else {
        //先にプレイヤー２が攻撃
        BattleCalc(SelectCard.player, SelectCard.atk, SelectCard.def, Player1.hp);
        //後からプレイヤー１が攻撃
        BattleCalc(SelectCard.player, SelectCard.atk, SelectCard.def, Player2.hp);
      } 
    }
    

    // バトル中のダメージ計算
    function BattleCalc(playernum, atknum, defnum, hpnum){
      
      //負の値にならないようにして計算結果を定義
      Damagevalue = Math.max(defnum - atknum, 0); 
      //HPの更新
      hpnum = Math.max(hpnum - Damagevalue, 0);
      if(playernum === 0){
        Player1.hp = hpnum; //クライアント１のHP更新
      }
      else if (playernum === 1){
        Player2.hp = hpnum; //クライアント２のHP更新
      }

      //ダメージの送信
      /*
      response[0] = 32;
      response[1] = serialNumber;
      response[2] = playernum;//攻撃プレイヤーのID
      response[3] = playernum+1 % 2;//被攻撃プレイヤーのID
      response[4] = Damagevalue;//特殊効果番号
      resopnse[5] = hpnum;//効果の引数1
      resopnse[6] = hpnum;//被攻撃プレイヤーのhp
      sendBinaryData(ws,response);
      */
    }
      
  });
  ws.on('close', function() {
    console.log("client left.");
  });
});

server.listen(port, function() {
  console.log('Listening on http://localhost:${port}');
});

function BinaryTranslation(recv_data){//信号を元に戻す どう考えてもいるわこれ
  const dataset = new Uint8Array(recv_data);
  console.log("binary received from client -> " + Array.from(recv_data).join(", ") + "");
  console.log("バイナリデータ",dataset);
  return dataset;

}

function sendBinaryData(ws,send_data){//信号をバイナリに変換して送信
  const buffer = new ArrayBuffer(9);
  const view = new DataView(buffer);
  //ここは共通の処理
  view.setUint8(0, send_data[0]); // 信号の種類
  view.setUint8(1, serialNumber++); // 命令の通し番号
  //通信種別による処理
  switch (send_data[0]){// ターン数の送信
    case 30:
      view.setUint8(2, send_data[2]); // ターン数
      break;
    case 31:
      view.setUint8(2, send_data[2]); // プレイヤーID
      view.setUint8(3, send_data[3]); // カード番号
      break;
    case 32:
      view.setUint8(2, send_data[2]); // ダメージ量
      view.setUint8(3, send_data[3]); // 攻撃プレイヤーID
      view.setUint8(4, send_data[4]); // 被攻撃プレイヤーID
      const specialEffect = send_data[5]; // 16ビットの特殊効果番号
      // 上位バイトと下位バイトを抽出
      const highByteEff = (specialEffect >> 8) & 0xFF; // 上位バイト
      const lowByteEff = specialEffect & 0xFF; // 下位バイト
      view.setUint8(5, highByteEff); // 特殊効果番号の上位バイトを格納
      view.setUint8(6, lowByteEff); // 特殊効果番号の下位バイトを格納
      const recentHP = send_data[6]; // hpの関係量
      const highByteHP = (recentHP >> 8) & 0xFF; // 上位バイト
      const lowByteHP = recentHP & 0xFF; // 下位バイト
      view.setUint8(6, highByteHP); // 特殊効果番号の上位バイトを格納
      view.setUint8(7, lowByteHP); // 特殊効果番号の下位バイトを格納
      break;
  }
  console.log("send_data",buffer); 
  serialNumber++;
  ws.send(buffer);
}


function CardSelect(data){
  //カード選択
  let pid = data[2];//プレイヤーID
  let cid = data[3];//カードID
  let selectedCard = cards[pid][cid];
  return selectedCard;
}


function EffBeforeBattle(pid){
  //バトル前の特殊効果
  selectedCard[pid].effectActive();
  turnManege ++;
  if(turnManege === 4){
    BattleFlow();
  }
}

function EffAfterBattle(pid){
  //バトル後の特殊効果
  selectedCard[pid].effectActive();
  turnManege ++;
  if(turnManege === 6){
    //ターン終了処理
    //特殊効果がある場合はここで処理
  }
}