<template>
  <div class="room" @click="onClick" :class="{ selected: selected }">
    <div class="description">
      {{ room.chatSeq }}
    </div>
    <div v-if="room.roominfo" class="new-messages">{{ room.roominfo }}</div>
  </div>
</template>

<script>
export default {
  name: "User",
  props: {
    room: Object,
    selected: Boolean,
  },
  methods: {
    onClick() {
      this.$emit("select");
    },
  },
};
</script>

<style scoped>
.selected {
  background-color: #1164a3;
}

.room {
  padding: 10px;
}

.description {
  display: inline-block;
}

.new-messages {
  color: rgb(217, 255, 0);
  background-color: rgb(193, 54, 163);
  border-radius: 5px;
  padding: 1px 3px;
  text-align: center;
  float: right;
}
</style>
