mod utils;

use std::fmt;
use tetris::game_master;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
extern "C" {
    fn rand_gen_js() -> usize;
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct WASMGameMaster {
    game_master: game_master::GameMaster,
    width: usize,
    height: usize,
    field: Vec<u8>,
    field_color: Vec<f32>,
    nexts: Vec<u8>,
    nexts_color: Vec<f32>,
    num_nexts: usize,
    next_size: usize,
    hold: Vec<u8>,
    hold_color: Vec<f32>,
    hold_size: usize,
}

#[wasm_bindgen]
impl WASMGameMaster {
    pub fn new(
        height: usize,
        width: usize,
        num_nexts: usize,
        next_size: usize,
        hold_size: usize,
        enable_ghost: bool,
        enable_garbage: bool,
    ) -> WASMGameMaster {
        let rand_gen_ng = Box::new(|| rand_gen_js());
        let rand_gen_gbg = Box::new(|| rand_gen_js());
        WASMGameMaster {
            game_master: game_master::GameMaster::new(
                height,
                width,
                rand_gen_ng,
                rand_gen_gbg,
                0,
                enable_ghost,
                enable_garbage,
            ),
            width: width,
            height: height,
            field: vec![0; width * height],
            field_color: vec![0.0; width * height * 4],
            nexts: vec![0; next_size * next_size * num_nexts],
            nexts_color: vec![0.0; next_size * next_size * num_nexts * 4],
            num_nexts: num_nexts,
            next_size: next_size,
            hold: vec![0; hold_size * hold_size],
            hold_color: vec![0.0; hold_size * hold_size * 4],
            hold_size: hold_size,
        }
    }

    pub fn get_width(&self) -> usize {
        self.width
    }

    pub fn get_height(&self) -> usize {
        self.height
    }

    pub fn get_num_deleted_lines(&self) -> u8 {
        self.game_master.get_num_deleted_lines() as u8
    }

    // TODO: field$B$r(Bpub$B$K$9$l$P$3$N4X?t$OI,MW$J$$$N$G$O!)(B
    // pointer$B$rJV$7$F$$$k;~E@$G%"%/%;%9@)8f$H$$$&0UL#$O$J$/$J$C$F$$$k(B
    pub fn field(&self) -> *const u8 {
        self.field.as_ptr()
    }

    pub fn field_color(&self) -> *const f32 {
        self.field_color.as_ptr()
    }

    pub fn nexts(&self) -> *const u8 {
        self.nexts.as_ptr()
    }

    pub fn nexts_color(&self) -> *const f32 {
        self.nexts_color.as_ptr()
    }

    pub fn hold(&mut self) -> *const u8 {
        self.hold.as_ptr()
    }

    pub fn hold_color(&self) -> *const f32 {
        self.hold_color.as_ptr()
    }

    /// $B3F(Bblock$B$,Kd$^$C$F$$$k$+$H(Bblock$B$N?'$r@_Dj(B
    pub fn render(&mut self) {
        let (projected_filled, projected_color) = self.game_master.project_controlled_mino();
        for i in 0..self.height {
            for j in 0..self.width {
                self.field[i * self.width + j] = projected_filled[i][j] as u8;
                for k in 0..4 {
                    self.field_color[i * self.width * 4 + j * 4 + k] =
                        projected_color[i][j][k] as f32;
                }
            }
        }
    }

    /// next$B$rI=<($9$k$?$a$N4X?t(B
    /// $B3F(Bnext$B$O(Bnext_size x next_size$B$N%5%$%:(B
    /// $B$=$l$,I=<($7$?$$(Bnext$B$N?t$@$1B8:_(B
    pub fn render_next(&mut self) {
        // TODO: $B%$%s%G%s%H$,B?$9$.$k(B
        for nexts_idx in 0..self.num_nexts {
            // $BG[Ns$NCf?H$r=i4|2=(B
            for i in 0..self.next_size * self.next_size {
                self.nexts[nexts_idx * self.next_size.pow(2) + i] = 0;
                for k in 0..4 {
                    self.nexts_color[nexts_idx * self.next_size.pow(2) * 4 + i * 4 + k] = 1.0;
                }
            }

            match self.game_master.get_next(nexts_idx) {
                Some(mino) => {
                    for i in 0..mino.get_size() {
                        for j in 0..mino.get_size() {
                            self.nexts
                                [nexts_idx * self.next_size.pow(2) + i * self.next_size + j] =
                                mino.get_shape()[i][j] as u8;
                            if mino.get_shape()[i][j] {
                                for k in 0..4 {
                                    self.nexts_color[nexts_idx * self.next_size.pow(2) * 4
                                        + i * self.next_size * 4
                                        + j * 4
                                        + k] = mino.get_color()[k] as f32;
                                }
                            } else {
                                for k in 0..4 {
                                    self.nexts_color[nexts_idx
                                        * self.next_size
                                        * self.next_size
                                        * 4
                                        + i * self.next_size * 4
                                        + j * 4
                                        + k] = 0.0;
                                }
                            }
                        }
                    }
                }
                None => {}
            }
        }
    }

    pub fn render_hold(&mut self) {
        for i in 0..self.hold_size {
            for j in 0..self.hold_size {
                self.hold[i * self.hold_size + j] = 0 as u8;
            }
        }
        match self.game_master.get_hold() {
            game_master::Hold::Holding(mino) => {
                for i in 0..mino.get_size() {
                    for j in 0..mino.get_size() {
                        self.hold[i * self.hold_size + j] = mino.get_shape()[i][j] as u8;
                        for k in 0..4 {
                            self.hold_color[i * self.hold_size * 4 + j * 4 + k] =
                                mino.get_color()[k] as f32;
                        }
                    }
                }
            }
            game_master::Hold::None => {
                for i in 0..self.hold_size {
                    for j in 0..self.hold_size {
                        self.hold[i * self.hold_size + j] = 0;
                        for k in 0..4 {
                            self.hold_color[i * self.hold_size * 4 + j * 4 + k] = 0.0 as f32;
                        }
                    }
                }
            }
        }
    }

    pub fn tick(
        &mut self,
        current_time_in_milli: i32,
        right_rotate_key: bool,
        left_rotate_key: bool,
        hold_key: bool,
        soft_drop_key: bool,
        hard_drop_key: bool,
        right_move_key: bool,
        left_move_key: bool,
    ) {
        let rust_key = game_master::KeyPress {
            right_rotate: right_rotate_key,
            left_rotate: left_rotate_key,
            hold: hold_key,
            soft_drop: soft_drop_key,
            hard_drop: hard_drop_key,
            right_move: right_move_key,
            left_move: left_move_key,
        };

        self.game_master.tick(current_time_in_milli, rust_key);
    }
}

impl fmt::Display for WASMGameMaster {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for line in self.field.as_slice().chunks(self.width as usize) {
            write!(f, "|")?;
            for &block in line {
                let symbol = if block == 0 { ' ' } else { '*' };
                write!(f, "{}", symbol)?;
            }
            write!(f, "|\n")?;
        }

        Ok(())
    }
}
