import random
from dataclasses import dataclass
from typing import List, Optional, Tuple


NUM_PLAYERS = 3
DICE_PER_PLAYER = 5


@dataclass
class Bid:
    count: int
    face: int

    def __str__(self) -> str:
        return f"{self.count}个{self.face}"


class Player:
    def __init__(self, name: str) -> None:
        self.name = name
        self.dice: List[int] = []

    def roll(self) -> None:
        self.dice = [random.randint(1, 6) for _ in range(DICE_PER_PLAYER)]


class LiarDiceGame:
    def __init__(self) -> None:
        self.players = [Player(f"玩家{i + 1}") for i in range(NUM_PLAYERS)]
        self.current_bid: Optional[Bid] = None
        self.current_player_idx = 0

    def start_round(self) -> None:
        for p in self.players:
            p.roll()
        self.current_bid = None
        self.current_player_idx = random.randint(0, NUM_PLAYERS - 1)

    def show_my_dice(self, player_idx: int) -> None:
        dice = sorted(self.players[player_idx].dice)
        print(f"\n{self.players[player_idx].name} 的骰子: {dice}")

    def next_player(self) -> None:
        self.current_player_idx = (self.current_player_idx + 1) % NUM_PLAYERS

    def is_bid_higher(self, new_bid: Bid, old_bid: Optional[Bid]) -> bool:
        if old_bid is None:
            return True
        # 规则：先比数量，数量相同则比点数
        return (new_bid.count, new_bid.face) > (old_bid.count, old_bid.face)

    def count_face_with_wild_one(self, face: int) -> int:
        total = 0
        for p in self.players:
            for d in p.dice:
                if d == face or d == 1:
                    total += 1
        return total

    def reveal_all(self) -> None:
        print("\n开盅！所有玩家骰子如下：")
        for p in self.players:
            print(f"{p.name}: {sorted(p.dice)}")

    def parse_bid(self, text: str) -> Optional[Bid]:
        parts = text.strip().split()
        if len(parts) != 2:
            return None
        try:
            count = int(parts[0])
            face = int(parts[1])
        except ValueError:
            return None
        if count < 1 or face < 1 or face > 6:
            return None
        return Bid(count, face)

    def ask_action(self, player_idx: int) -> Tuple[str, Optional[Bid]]:
        player = self.players[player_idx]
        print(f"\n轮到 {player.name} 行动。")
        if self.current_bid is None:
            print("当前还没人叫点，你必须叫点。输入格式：数量 点数，例如：3 5")
            while True:
                text = input("> ").strip()
                bid = self.parse_bid(text)
                if bid is None:
                    print("输入无效，请按格式输入：数量 点数（如 3 5）")
                    continue
                return "bid", bid

        print(f"当前叫点：{self.current_bid}")
        print("你可以输入：")
        print("1) 叫点：数量 点数（必须比当前更大）")
        print("2) 开：输入 open")

        while True:
            text = input("> ").strip().lower()
            if text == "open":
                return "open", None
            bid = self.parse_bid(text)
            if bid is None:
                print("输入无效。请输入更大的叫点（如 4 6）或输入 open")
                continue
            if not self.is_bid_higher(bid, self.current_bid):
                print("叫点必须比当前更大。")
                continue
            return "bid", bid

    def settle_round(self, opener_idx: int) -> None:
        assert self.current_bid is not None
        prev_idx = (opener_idx - 1) % NUM_PLAYERS
        opener = self.players[opener_idx]
        bidder = self.players[prev_idx]

        self.reveal_all()
        actual = self.count_face_with_wild_one(self.current_bid.face)
        print(f"\n当前叫点是：{self.current_bid}")
        print(f"实际满足（含1万能）的数量：{actual}")

        if actual >= self.current_bid.count:
            print(f"\n叫点成立！{opener.name} 开错了，{opener.name} 本局失败。")
        else:
            print(f"\n叫点不成立！{bidder.name} 吹牛失败，{bidder.name} 本局失败。")

    def run(self) -> None:
        print("=== 大话骰子（3人版）===")
        print("规则简述：")
        print("- 固定3名玩家，每人5个骰子。")
        print("- 每局暗骰后轮流叫点，格式：数量 点数（如 4 6）。")
        print("- 叫点必须越来越大：先比数量，数量相同比点数。")
        print("- 任意玩家可在自己回合输入 open 开盅。")
        print("- 1为万能：结算任意点数时，1都计入该点数数量。")
        print("- 开盅后若叫点成立，开盅者输；否则上一个叫点者输。")

        while True:
            self.start_round()
            print("\n==============================")
            print(f"新一局开始，{self.players[self.current_player_idx].name} 先手。")

            while True:
                self.show_my_dice(self.current_player_idx)
                action, bid = self.ask_action(self.current_player_idx)

                if action == "bid" and bid is not None:
                    self.current_bid = bid
                    print(f"{self.players[self.current_player_idx].name} 叫点：{bid}")
                    self.next_player()
                    continue

                if action == "open":
                    self.settle_round(self.current_player_idx)
                    break

            again = input("\n是否再来一局？(y/n): ").strip().lower()
            if again != "y":
                print("游戏结束，感谢游玩！")
                break


if __name__ == "__main__":
    game = LiarDiceGame()
    game.run()
