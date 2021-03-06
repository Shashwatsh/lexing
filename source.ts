import {Source, SourceStringIterator} from './index';
import {indexOf as bufferIndexOf, lastIndexOf as bufferLastIndexOf} from './buffer';

/**
Starting at fromIndex (defaults to 0), read until we find `needle`.

1. If we do find needle, return the file's position of the first character of `needle`.
2. If we reach EOF without finding it, return undefined.
*/
export function indexOf(source: Source,
                        searchValue: string,
                        fromIndex = 0,
                        BLOCK_SIZE = 1024): number {
  var needle = new Buffer(searchValue);
  var position = fromIndex;
  var haystack = new Buffer(0);
  var haystack_file_position = position;
  var haystack_search_offset = 0;
  var block_buffer = new Buffer(BLOCK_SIZE);
  var bytesRead = BLOCK_SIZE;
  // exit loop once we read fewer bytes than intended (indicating EOF)
  while (bytesRead == BLOCK_SIZE) {
    // we use the position once, to seek, and then set it to null, to use the
    // current position on subsequent reads. Hopefully no one else has seeked
    // on this file descriptor by the next time we use it! But wait...
    // TODO: figure out why setting position it to null wraps around to the beginning
    //       see s/position += bytesRead;/position = null/ below
    bytesRead = source.read(block_buffer, 0, BLOCK_SIZE, position);
    position += bytesRead;
    // append new block to stateful buffer; block_buffer may have extra bytes
    // at the end, so only read up to the readBytes mark
    haystack = Buffer.concat([haystack, block_buffer], haystack.length + bytesRead);
    // TODO: only start looking in the haystack (`buffer`) at the old
    //   offset, backtracking by needle.length in case there's a partial match
    var needle_haystack_index = bufferIndexOf(haystack, needle, haystack_search_offset);
    // needle_haystack_index, if not undefined, is the position of needle within haystack
    if (needle_haystack_index !== undefined) {
      // we found it!
      return haystack_file_position + needle_haystack_index;
    }
  }
  // we hit EOF before finding needle; return undefined
}

/**
Starting at fromIndex (defaults to EOF), read backwards until we find `needle`.

1. If we do find needle, return the file's position of the first character of `needle`.
2. If we reach the beginning of the file before finding it, return undefined.
*/
export function lastIndexOf(source: Source,
                            searchValue: string,
                            fromIndex = source.size,
                            BLOCK_SIZE = 1024): number {
  var needle = new Buffer(searchValue);
  var position = fromIndex;
  var haystack = new Buffer(0);
  // haystack's position within file is always equal to `position`
  // exit loop once we reach the beginning of the file.
  while (position > -1) {
    position -= BLOCK_SIZE;
    var block_buffer = <Buffer>source.readBuffer(BLOCK_SIZE, position);
    haystack = Buffer.concat([block_buffer, haystack]);
    // TODO: only start looking in the haystack (`buffer`) at the old
    //   offset, backtracking by needle.length in case there's a partial match
    var last_index_of_needle_within_haystack = bufferLastIndexOf(haystack, needle);
    if (last_index_of_needle_within_haystack !== undefined) {
      // we found it!
      return position + last_index_of_needle_within_haystack;
    }
  }
  // we hit EOF before finding needle; return undefined
}
